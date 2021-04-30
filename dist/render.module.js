"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var RenderModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const render_filter_1 = require("./render.filter");
const render_service_1 = require("./render.service");
let RenderModule = RenderModule_1 = class RenderModule {
    constructor(httpAdapterHost, applicationConfig, service) {
        this.httpAdapterHost = httpAdapterHost;
        this.applicationConfig = applicationConfig;
        this.service = service;
    }
    static forRootAsync(next, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof next.prepare === 'function') {
                yield next.prepare();
            }
            const nextConfig = next.nextConfig;
            const nextServer = next.server;
            const basePath = nextConfig
                ? nextConfig.basePath
                : nextServer.nextConfig.basePath;
            const config = Object.assign({ basePath }, options);
            return {
                exports: [render_service_1.RenderService],
                module: RenderModule_1,
                providers: [
                    {
                        inject: [core_1.HttpAdapterHost],
                        provide: render_service_1.RenderService,
                        useFactory: (nestHost) => {
                            return render_service_1.RenderService.init(config, next.getRequestHandler(), next.render.bind(next), next.renderError.bind(next), nestHost.httpAdapter);
                        },
                    },
                    {
                        inject: [core_1.ApplicationConfig, render_service_1.RenderService],
                        provide: render_filter_1.RenderFilter,
                        useFactory: (nestConfig, service) => {
                            const filter = new render_filter_1.RenderFilter(service);
                            nestConfig.addGlobalFilter(filter);
                            return filter;
                        },
                    },
                ],
            };
        });
    }
    register(_app, next, options = {}) {
        console.error('RenderModule.register() is deprecated and will be removed in a future release.');
        console.error('Please use RenderModule.forRootAsync() when importing the module, and remove this post init call.');
        if (!this.service.isInitialized()) {
            this.service.mergeConfig(options);
            this.service.setRequestHandler(next.getRequestHandler());
            this.service.setRenderer(next.render.bind(next));
            this.service.setErrorRenderer(next.renderError.bind(next));
            this.service.bindHttpServer(this.httpAdapterHost.httpAdapter);
            this.applicationConfig.useGlobalFilters(new render_filter_1.RenderFilter(this.service));
        }
    }
};
RenderModule = RenderModule_1 = __decorate([
    common_1.Module({
        providers: [render_service_1.RenderService],
    }),
    __metadata("design:paramtypes", [core_1.HttpAdapterHost,
        core_1.ApplicationConfig,
        render_service_1.RenderService])
], RenderModule);
exports.RenderModule = RenderModule;
