import { IncomingMessage, ServerResponse } from 'http';
import { Plugin } from 'vite';

interface ViteMockOptions {
    baseApi?: string;
    mockPath?: string;
    configPath?: string;
    ignore?: RegExp | ((fileName: string) => boolean);
    watchFiles?: boolean;
    localEnabled?: boolean;
    prodEnabled?: boolean;
    injectFile?: string;
    injectCode?: string;
    /**
     * Automatic recognition, no need to configure again
     * @deprecated Deprecated after 2.8.0
     */
    supportTs?: boolean;
    logger?: boolean;
}
interface RespThisType {
    req: IncomingMessage;
    res: ServerResponse;
    parseJson: () => any;
}
declare type MethodType = 'get' | 'post' | 'put' | 'delete' | 'patch';
declare type Recordable<T = any> = Record<string, T>;
declare interface MockMethod {
    url: string;
    method?: MethodType;
    timeout?: number;
    statusCode?: number;
    response?: ((this: RespThisType, opt: {
        url: Recordable;
        body: Recordable;
        query: Recordable;
        headers: Recordable;
    }) => any) | any;
    rawResponse?: (this: RespThisType, req: IncomingMessage, res: ServerResponse) => void;
}
interface NodeModuleWithCompile extends NodeModule {
    _compile(code: string, filename: string): any;
}

declare function viteMockServe(opt?: ViteMockOptions): Plugin;

export { MethodType, MockMethod, NodeModuleWithCompile, Recordable, RespThisType, ViteMockOptions, viteMockServe };
