"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderService = void 0;
const common_1 = require("@nestjs/common");
const next_utils_1 = require("./next-utils");
class RenderService {
    constructor() {
        this.initialized = false;
        this.config = {
            dev: process.env.NODE_ENV !== 'production',
            viewsDir: '/views',
        };
    }
    static init(config, handler, renderer, errorRenderer, server) {
        const self = new RenderService();
        self.mergeConfig(config);
        self.setRequestHandler(handler);
        self.setRenderer(renderer);
        self.setErrorRenderer(errorRenderer);
        self.bindHttpServer(server);
        return self;
    }
    mergeConfig(config) {
        if (typeof config.dev === 'boolean') {
            this.config.dev = config.dev;
        }
        if (typeof config.viewsDir === 'string' || config.viewsDir === null) {
            this.config.viewsDir = config.viewsDir;
        }
        if (typeof config.basePath === 'string') {
            this.config.basePath = config.basePath;
        }
    }
    setViewsDir(path) {
        this.config.viewsDir = path;
    }
    getViewsDir() {
        return this.config.viewsDir;
    }
    setIsDev(dev) {
        this.config.dev = dev;
    }
    isDev() {
        return this.config.dev;
    }
    setRequestHandler(handler) {
        this.requestHandler = handler;
    }
    getRequestHandler() {
        return this.requestHandler;
    }
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    getRenderer() {
        return this.renderer;
    }
    setErrorRenderer(errorRenderer) {
        this.errorRenderer = errorRenderer;
    }
    getErrorRenderer() {
        return this.errorRenderer;
    }
    setErrorHandler(handler) {
        this.errorHandler = handler;
    }
    getErrorHandler() {
        return this.errorHandler;
    }
    isInternalUrl(url) {
        if (this.config.basePath && url.startsWith(this.config.basePath)) {
            return next_utils_1.isInternalUrl(url.replace(this.config.basePath, ''));
        }
        return next_utils_1.isInternalUrl(url);
    }
    isInitialized() {
        return this.initialized;
    }
    bindHttpServer(server) {
        if (this.initialized) {
            throw new Error('RenderService: already initialized');
        }
        this.initialized = true;
        const renderer = this.getRenderer();
        const getViewPath = this.getViewPath.bind(this);
        server.render = (response, view, data) => {
            const isFastify = response.request !== undefined;
            const res = isFastify ? response.res : response;
            const req = isFastify ? response.request.raw : response.req;
            if (req && res && renderer) {
                if (isFastify) {
                    response.sent = true;
                }
                return renderer(req, res, getViewPath(view), data);
            }
            else if (!renderer) {
                throw new common_1.InternalServerErrorException('RenderService: renderer is not set');
            }
            else if (!res) {
                throw new common_1.InternalServerErrorException('RenderService: could not get the response');
            }
            else if (!req) {
                throw new common_1.InternalServerErrorException('RenderService: could not get the request');
            }
            throw new Error('RenderService: failed to render');
        };
        let isFastifyAdapter = false;
        try {
            const { FastifyAdapter } = require('@nestjs/platform-fastify');
            isFastifyAdapter = server instanceof FastifyAdapter;
        }
        catch (e) {
        }
        if (isFastifyAdapter) {
            server
                .getInstance()
                .decorateReply('render', function (view, data) {
                const res = this.res;
                const req = this.request.raw;
                if (!renderer) {
                    throw new common_1.InternalServerErrorException('RenderService: renderer is not set');
                }
                this.sent = true;
                return renderer(req, res, getViewPath(view), data);
            });
        }
        else {
            server.getInstance().use((req, res, next) => {
                res.render = ((view, data) => {
                    if (!renderer) {
                        throw new common_1.InternalServerErrorException('RenderService: renderer is not set');
                    }
                    return renderer(req, res, getViewPath(view), data);
                });
                next();
            });
        }
    }
    getViewPath(view) {
        const baseDir = this.getViewsDir();
        const basePath = baseDir ? baseDir : '';
        return `${basePath}/${view}`;
    }
}
exports.RenderService = RenderService;
