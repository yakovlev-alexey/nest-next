import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { RenderService } from './render.service';
import { ErrorResponse } from './types';
export declare class RenderFilter implements ExceptionFilter {
    private readonly service;
    constructor(service: RenderService);
    catch(err: any, host: ArgumentsHost): Promise<void>;
    serializeError(err: any): ErrorResponse;
}
