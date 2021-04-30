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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderFilter = void 0;
const common_1 = require("@nestjs/common");
const url_1 = require("url");
const render_service_1 = require("./render.service");
let RenderFilter = class RenderFilter {
    constructor(service) {
        this.service = service;
    }
    catch(err, host) {
        return __awaiter(this, void 0, void 0, function* () {
            const ctx = host.switchToHttp();
            const request = ctx.getRequest();
            const response = ctx.getResponse();
            if (response && request) {
                const requestHandler = this.service.getRequestHandler();
                const errorRenderer = this.service.getErrorRenderer();
                if (!requestHandler || !errorRenderer) {
                    throw new Error('Request and/or error renderer not set on RenderService');
                }
                const isFastify = !!response.res;
                const res = isFastify ? response.res : response;
                const req = isFastify ? request.raw : request;
                if (!res.headersSent && req.url) {
                    if (this.service.isInternalUrl(req.url)) {
                        if (isFastify) {
                            response.sent = true;
                        }
                        return requestHandler(req, res);
                    }
                    res.statusCode = err && err.status ? err.status : 500;
                    const { pathname, query } = url_1.parse(req.url, true);
                    const errorHandler = this.service.getErrorHandler();
                    if (errorHandler) {
                        yield errorHandler(err, request, response, pathname, query);
                    }
                    if (response.sent === true || res.headersSent) {
                        return;
                    }
                    const serializedErr = this.serializeError(err);
                    if (isFastify) {
                        response.sent = true;
                    }
                    if (res.statusCode === common_1.HttpStatus.NOT_FOUND) {
                        return errorRenderer(null, req, res, pathname, Object.assign(Object.assign({}, query), { [Symbol.for('Error')]: serializedErr }));
                    }
                    return errorRenderer(serializedErr, req, res, pathname, query);
                }
                return;
            }
            throw err;
        });
    }
    serializeError(err) {
        const out = {};
        if (!err) {
            return out;
        }
        if (err.stack && this.service.isDev()) {
            out.stack = err.stack;
        }
        if (err.response && typeof err.response === 'object') {
            const { statusCode, error, message } = err.response;
            out.statusCode = statusCode;
            out.name = error;
            out.message = message;
        }
        else if (err.message && typeof err.message === 'object') {
            const { statusCode, error, message } = err.message;
            out.statusCode = statusCode;
            out.name = error;
            out.message = message;
        }
        if (!out.statusCode && err.status) {
            out.statusCode = err.status;
        }
        if (!out.message && err.message) {
            out.message = err.message;
        }
        return out;
    }
};
RenderFilter = __decorate([
    common_1.Catch(),
    __metadata("design:paramtypes", [render_service_1.RenderService])
], RenderFilter);
exports.RenderFilter = RenderFilter;
