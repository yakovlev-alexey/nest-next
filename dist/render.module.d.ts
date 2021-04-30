import { DynamicModule } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import Server from 'next';
import { RenderService } from './render.service';
import { RendererConfig } from './types';
export declare class RenderModule {
    private readonly httpAdapterHost;
    private readonly applicationConfig;
    private readonly service;
    static forRootAsync(next: ReturnType<typeof Server>, options?: Partial<RendererConfig>): Promise<DynamicModule>;
    constructor(httpAdapterHost: HttpAdapterHost, applicationConfig: ApplicationConfig, service: RenderService);
    register(_app: any, next: ReturnType<typeof Server>, options?: Partial<RendererConfig>): void;
}
