import path from 'path';
import { HttpServer, InternalServerErrorException } from '@nestjs/common';
import { ParsedUrlQuery } from 'querystring';
import { isInternalUrl } from './next-utils';
import {
  ErrorHandler,
  ErrorRenderer,
  RenderableResponse,
  Renderer,
  RendererConfig,
  RequestHandler,
} from './types';

import { getNamedRouteRegex } from './vendor/next/route-regex';
import { interpolateDynamicPath } from './vendor/next/interpolate-dynamic-path';
import { isDynamicRoute } from './vendor/next/is-dynamic';

export class RenderService {
  public static init(
    config: Partial<RendererConfig>,
    handler: RequestHandler,
    renderer: Renderer,
    errorRenderer: ErrorRenderer,
    server: HttpServer,
  ): RenderService {
    const self = new RenderService();
    self.mergeConfig(config);
    self.setRequestHandler(handler);
    self.setRenderer(renderer);
    self.setErrorRenderer(errorRenderer);
    self.bindHttpServer(server);
    return self;
  }

  private initialized = false;
  private requestHandler?: RequestHandler;
  private renderer?: Renderer;
  private errorRenderer?: ErrorRenderer;
  private errorHandler?: ErrorHandler;
  private config: RendererConfig = {
    dev: process.env.NODE_ENV !== 'production',
    passthrough404: false,
    viewsDir: '/views',
  };
  private dynamicRouteRegexes = new Map<
    string,
    ReturnType<typeof getNamedRouteRegex>
  >();

  /**
   * Merge the default config with the config obj passed to method
   * @param config
   */
  public mergeConfig(config: Partial<RendererConfig>) {
    if (typeof config.dev === 'boolean') {
      this.config.dev = config.dev;
    }
    if (typeof config.viewsDir === 'string' || config.viewsDir === null) {
      this.config.viewsDir = config.viewsDir;
    }
    if (typeof config.passthrough404 === 'boolean') {
      this.config.passthrough404 = config.passthrough404;
    }
    if (typeof config.basePath === 'string') {
      this.config.basePath = config.basePath;
    }
    if (config.dynamicRoutes?.length) {
      this.initializeDynamicRouteRegexes(config.dynamicRoutes);
    }
  }

  /**
   * Set the directory that Next will render pages from
   * @param path
   */
  public setViewsDir(path: string | null) {
    this.config.viewsDir = path;
  }

  /**
   * Get the directory that Next renders pages from
   */
  public getViewsDir() {
    return this.config.viewsDir;
  }

  /**
   * Explicitly set if env is or not dev
   * @param dev
   */
  public setIsDev(dev: boolean) {
    this.config.dev = dev;
  }

  /**
   * Get if the env is dev
   */
  public isDev(): boolean {
    return this.config.dev!;
  }

  /**
   * Should 404 errors passthrough to Next
   */
  public passthroughNotFoundErrors(): boolean {
    return !!this.config.passthrough404;
  }

  /**
   * Set the default request handler provided by next
   * @param handler
   */
  public setRequestHandler(handler: RequestHandler) {
    this.requestHandler = handler;
  }

  /**
   * Get the default request handler
   */
  public getRequestHandler(): RequestHandler | undefined {
    return this.requestHandler;
  }

  /**
   * Set the render function provided by next
   * @param renderer
   */
  public setRenderer(renderer: Renderer) {
    this.renderer = renderer;
  }

  /**
   * Get the render function provided by next
   */
  public getRenderer(): Renderer | undefined {
    return this.renderer;
  }

  /**
   * Set nextjs error renderer
   * @param errorRenderer
   */
  public setErrorRenderer(errorRenderer: ErrorRenderer) {
    this.errorRenderer = errorRenderer;
  }

  /**
   * Get nextjs error renderer
   */
  public getErrorRenderer(): ErrorRenderer | undefined {
    return this.errorRenderer;
  }

  /**
   * Set a custom error handler
   * @param handler
   */
  public setErrorHandler(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  /**
   * Get the custom error handler
   */
  public getErrorHandler(): ErrorHandler | undefined {
    return this.errorHandler;
  }

  /**
   * Check if the URL is internal to nextjs
   * @param url
   */
  public isInternalUrl(url: string): boolean {
    if (this.config.basePath && url.startsWith(this.config.basePath)) {
      return isInternalUrl(url.replace(this.config.basePath, ''));
    }

    return isInternalUrl(url);
  }

  public initializeDynamicRouteRegexes(routes: string[] = []) {
    for (const route of routes) {
      const pathname = this.getNormalizedPath(route);

      this.dynamicRouteRegexes.set(route, getNamedRouteRegex(pathname));
    }
  }

  /**
   * Check if the service has been initialized by the module
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Bind to the render function for the HttpServer that nest is using and override
   * it to allow for next to render the page
   * @param server
   */
  public bindHttpServer(server: HttpServer) {
    if (this.initialized) {
      throw new Error('RenderService: already initialized');
    }

    this.initialized = true;
    const renderer = this.getRenderer();
    const getViewPath = this.getViewPath.bind(this);

    server.render = (response: any, view: string, data: any) => {
      const isFastify = response.request !== undefined;

      const res = isFastify ? response.res : response;
      const req = isFastify ? response.request.raw : response.req;

      if (req && res && renderer) {
        if (isFastify) {
          response.sent = true;
        }
        return renderer(req, res, getViewPath(view, req.params), data);
      } else if (!renderer) {
        throw new InternalServerErrorException(
          'RenderService: renderer is not set',
        );
      } else if (!res) {
        throw new InternalServerErrorException(
          'RenderService: could not get the response',
        );
      } else if (!req) {
        throw new InternalServerErrorException(
          'RenderService: could not get the request',
        );
      }

      throw new Error('RenderService: failed to render');
    };

    let isFastifyAdapter = false;
    try {
      const { FastifyAdapter } = require('@nestjs/platform-fastify');
      isFastifyAdapter = server instanceof FastifyAdapter;
    } catch (e) {
      // Failed to load @nestjs/platform-fastify probably. Assume not fastify.
    }

    // and nextjs renderer to reply/response
    if (isFastifyAdapter) {
      server
        .getInstance()
        .decorateReply('render', function (
          view: string,
          data?: ParsedUrlQuery,
        ) {
          const res = this.res;
          const req = this.request.raw;

          if (!renderer) {
            throw new InternalServerErrorException(
              'RenderService: renderer is not set',
            );
          }

          this.sent = true;

          return renderer(req, res, getViewPath(view, req.params), data);
        } as RenderableResponse['render']);
    } else {
      server.getInstance().use((req: any, res: any, next: () => any) => {
        res.render = ((view: string, data?: ParsedUrlQuery) => {
          if (!renderer) {
            throw new InternalServerErrorException(
              'RenderService: renderer is not set',
            );
          }

          return renderer(req, res, getViewPath(view, req.params), data);
        }) as RenderableResponse['render'];

        next();
      });
    }
  }

  public getNormalizedPath(view: string) {
    const basePath = this.getViewsDir() ?? '';
    const denormalizedPath = [basePath, view].join(
      view.startsWith('/') ? '' : '/',
    );

    const pathname = path.posix.normalize(denormalizedPath);

    return pathname;
  }

  /**
   * Format the path to the view including path parameters interpolation
   * Copied Next.js code is used for interpolation
   * @param view
   * @param params
   */
  protected getViewPath(view: string, params: ParsedUrlQuery) {
    const pathname = this.getNormalizedPath(view);

    if (!isDynamicRoute(pathname)) {
      return pathname;
    }

    const regex = this.dynamicRouteRegexes.get(pathname);

    if (!regex) {
      console.warn(
        `RenderService: view ${view} is dynamic and has no route regex`,
      );
    }

    return interpolateDynamicPath(pathname, params, regex);
  }
}
