import { HttpServer } from '@nestjs/common';
import { ErrorHandler, ErrorRenderer, Renderer, RendererConfig, RequestHandler } from './types';
export declare class RenderService {
    static init(config: Partial<RendererConfig>, handler: RequestHandler, renderer: Renderer, errorRenderer: ErrorRenderer, server: HttpServer): RenderService;
    private initialized;
    private requestHandler?;
    private renderer?;
    private errorRenderer?;
    private errorHandler?;
    private config;
    mergeConfig(config: Partial<RendererConfig>): void;
    setViewsDir(path: string | null): void;
    getViewsDir(): string | null;
    setIsDev(dev: boolean): void;
    isDev(): boolean;
    setRequestHandler(handler: RequestHandler): void;
    getRequestHandler(): RequestHandler | undefined;
    setRenderer(renderer: Renderer): void;
    getRenderer(): Renderer | undefined;
    setErrorRenderer(errorRenderer: ErrorRenderer): void;
    getErrorRenderer(): ErrorRenderer | undefined;
    setErrorHandler(handler: ErrorHandler): void;
    getErrorHandler(): ErrorHandler | undefined;
    isInternalUrl(url: string): boolean;
    isInitialized(): boolean;
    bindHttpServer(server: HttpServer): void;
    protected getViewPath(view: string): string;
}
