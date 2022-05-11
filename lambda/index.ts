import { IncomingHttpHeaders } from 'http';
import type { NextApiRequest as NextApiRequest_, NextApiResponse } from 'next';
import { HttpError } from '../errors';

export type Handler<
  Req = any,
  Res = any,
  Ctx1 extends {} = {},
  Ctx2 extends {} = {},
> = (
  req: NextApiRequest<Req>,
  res: NextApiResponse<Res>,
  ctx: Partial<Ctx2> & Ctx1,
  skipChecks?: boolean,
) => Promise<Res | symbol> | Res | symbol;

type RequestData = {
  query?: { [key: string]: string | string[] };
  body?: any;
  cookies?: { [key: string]: string };
  headers?: { [key: string]: string | string[] };
};

export type NextApiRequest<D extends RequestData = RequestData> = Omit<
  NextApiRequest_,
  'body' | 'query' | 'headers' | 'cookies'
> & {
  body: D['body'] extends undefined ? any : D['body'];
  query: D['query'] extends { [key: string]: string | string[] }
    ? D['query']
    : { [key: string]: string | string[] };
  cookies: D['cookies'] extends { [key: string]: string }
    ? D['cookies']
    : { [key: string]: string };
  headers: D['headers'] extends undefined
    ? IncomingHttpHeaders
    : IncomingHttpHeaders & D['headers'];
};

export interface ApiRoute<Ctx extends {} = {}>
  extends Handler<any, any, {}, Ctx> {}

export class ApiRoute<Ctx extends {} = {}> {
  public static new(allowedMethods: string[] | Set<string> = []): ApiRoute {
    const it = new Proxy(
      Object.assign(
        (
          req: NextApiRequest,
          res: NextApiResponse,
          ctx: {},
          skipChecks: boolean,
        ) => {
          req.cookies;
          return ApiRoute.prototype.request.bind(it)(req, res, ctx, skipChecks);
        },
        {
          handlers: [],
          allowedMethods:
            allowedMethods instanceof Array
              ? new Set(allowedMethods)
              : allowedMethods,
        },
      ),
      {
        get: (target, prop) => {
          if (prop === 'get') return ApiRoute.prototype.get.bind(it);
          if (prop === 'handle') return ApiRoute.prototype.handle.bind(it);
          if (prop === 'post') return ApiRoute.prototype.post.bind(it);
          if (prop === 'put') return ApiRoute.prototype.put.bind(it);
          if (prop === 'delete') return ApiRoute.prototype.delete.bind(it);
          if (prop === 'head') return ApiRoute.prototype.head.bind(it);
          if (prop === 'patch') return ApiRoute.prototype.patch.bind(it);
          if (prop === 'options') return ApiRoute.prototype.options.bind(it);
          if (prop === 'all') return ApiRoute.prototype.all.bind(it);
          if (prop === 'use') return ApiRoute.prototype.use.bind(it);
          return target[prop as keyof typeof target];
        },
        set: (target, prop, value) => {
          target[prop as keyof typeof target] = value;
          return true;
        },
      },
    ) as any as ApiRoute;
    return it;
  }

  public static NEXT = Symbol('NEXT');
  public static NORESPONSE = Symbol('NORESPONSE');

  private handlers: [string[], Handler][] = [];
  private allowedMethods!: Set<string>;
  private loadPrevioudContext!: boolean;

  private constructor() {}

  public handle(method: string | string[], handler: Handler): ApiRoute {
    method = method instanceof Array ? method : [method];
    this.handlers.push([method, handler]);
    return this;
  }

  public get<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('get');
    return this.handle(
      'get',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public post<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('post');
    return this.handle(
      'post',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public put<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('put');
    return this.handle(
      'put',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public delete<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('delete');
    return this.handle(
      'delete',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public head<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('head');
    return this.handle(
      'head',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public patch<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('patch');
    return this.handle(
      'patch',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public options<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('options');
    return this.handle(
      'options',
      handler as Handler<any, any, {}>,
    ) as ApiRoute<Ctx>;
  }

  public all<Req = unknown, Res = unknown>(
    handler: Handler<Req, Res, Ctx>,
  ): ApiRoute<Ctx> {
    this.allowedMethods.add('*');
    return this.handle('*', handler as Handler<any, any, {}>) as ApiRoute<Ctx>;
  }

  public use<Req = any, Res = any, Ctx2 extends {} = {}>(
    handler: Handler<Req, Res, Ctx, Ctx2>,
    methods: string | string[] = '*',
  ): ApiRoute<Ctx & Ctx2> {
    return this.handle(
      methods,
      handler as Handler<Req, Res, {}>,
    ) as any as ApiRoute<Ctx & Ctx2>;
  }

  private async request(
    req: NextApiRequest,
    res: NextApiResponse,
    ctx: Ctx = {} as Ctx,
    skipChecks = false,
  ): Promise<symbol> {
    if (!this.handlers.length) console.warn('No handlers for this route');
    if (
      !skipChecks &&
      !this.allowedMethods.has(req.method?.toLowerCase() || 'get') &&
      !this.allowedMethods.has('*')
    ) {
      res
        .status(405)
        .setHeader('Content-Type', 'application/json')
        .setHeader(
          'Allow',
          Array.from(this.allowedMethods)
            .map(method => method.toUpperCase())
            .join(', '),
        )
        .json({
          error: {
            code: 'method_not_allowed',
            message: `Method ${req.method} not allowed`,
          },
        });
      return ApiRoute.NORESPONSE;
    }
    try {
      for (const [methods, handler] of this.handlers) {
        if (
          methods[0] === '*' ||
          methods.includes(req.method?.toLowerCase() || 'get')
        ) {
          const result = await handler(req, res, ctx!, true);
          if (result !== ApiRoute.NEXT) {
            if (result === ApiRoute.NORESPONSE) return ApiRoute.NORESPONSE;
            if (typeof result === 'object') res.json(result);
            else if (typeof result === 'string') res.send(result);
            else res.send('');
            return ApiRoute.NORESPONSE;
          }
        }
      }
      if (!skipChecks) res.send('');
      return ApiRoute.NEXT;
    } catch (error) {
      if (skipChecks) throw error;
      if (error instanceof HttpError) {
        res.status(error.status).json({
          error: {
            code: error.statusCode,
            message: error.message,
          },
          data: error.data,
        });
      } else {
        res.status(500).send({
          error: {
            message: 'Internal Server Error',
            code: 'internal_server_error',
          },
        });
      }
      return ApiRoute.NORESPONSE;
    }
  }
}
