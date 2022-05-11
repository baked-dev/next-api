import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { HttpError } from '../errors';

export type EdgeHandler<
  Req extends RequestData = RequestData,
  Res = any,
  Ctx1 extends {} = {},
  Ctx2 extends {} = {},
> = (
  req: NextEdgeApiRequest<Req>,
  event: NextFetchEvent,
  ctx: Partial<Ctx2> & Ctx1,
  skipChecks?: boolean,
) => Promise<NextResponse | symbol> | NextResponse | symbol;

type RequestData = {
  body?: any;
  cookies?: { [key: string]: string };
  headers?: { [key: string]: string };
};

export type NextEdgeApiRequest<D extends RequestData = RequestData> = Omit<
  NextRequest,
  'json' | 'headers' | 'cookies'
> & {
  json(): D['body'] extends undefined ? Promise<any> : Promise<D['body']>;
  cookies: D['cookies'] extends { [key: string]: string }
    ? D['cookies']
    : { [key: string]: string };
  headers: D['headers'] extends undefined
    ? Headers
    : TypedHeaders<D['headers']>;
};

type TypedHeaders<H extends { [key: string]: string } | undefined = {}> = Omit<
  Headers,
  'get' | 'delete' | 'has' | 'set'
> & {
  get<K extends string>(key: K): K extends keyof H ? string : string | null;
  set<K extends string>(key: keyof H | K, to: string): void;
  delete<K extends string>(key: keyof H | K): void;
  has<K extends string>(key: keyof H | K): void;
};

export interface EdgeApiRoute<Ctx extends {} = {}>
  extends EdgeHandler<any, any, {}, Ctx> {}

export class EdgeApiRoute<Ctx extends {} = {}> {
  public static new(allowedMethods: string[] = []): EdgeApiRoute {
    const it = new Proxy(
      Object.assign(
        (
          req: NextEdgeApiRequest,
          event: NextFetchEvent,
          ctx: {},
          skipChecks: boolean,
        ) => {
          return EdgeApiRoute.prototype.request.bind(it)(
            req,
            event,
            ctx,
            skipChecks,
          );
        },
        {
          handlers: [],
          allowedMethods,
        },
      ),
      {
        get: (target, prop) => {
          if (prop === 'get') return EdgeApiRoute.prototype.get.bind(it);
          if (prop === 'handle') return EdgeApiRoute.prototype.handle.bind(it);
          if (prop === 'post') return EdgeApiRoute.prototype.post.bind(it);
          if (prop === 'put') return EdgeApiRoute.prototype.put.bind(it);
          if (prop === 'delete') return EdgeApiRoute.prototype.delete.bind(it);
          if (prop === 'head') return EdgeApiRoute.prototype.head.bind(it);
          if (prop === 'patch') return EdgeApiRoute.prototype.patch.bind(it);
          if (prop === 'options')
            return EdgeApiRoute.prototype.options.bind(it);
          if (prop === 'all') return EdgeApiRoute.prototype.all.bind(it);
          if (prop === 'use') return EdgeApiRoute.prototype.use.bind(it);
          return target[prop as keyof typeof target];
        },
        set: (target, prop, value) => {
          target[prop as keyof typeof target] = value;
          return true;
        },
      },
    ) as any as EdgeApiRoute;
    return it;
  }

  public static FORWARD = Symbol('FORWARD');
  public static NEXT = Symbol('NEXT');

  private handlers: [string[], EdgeHandler][] = [];
  private allowedMethods!: string[];

  private constructor() {}

  public handle(
    method: string | string[],
    edgehandler: EdgeHandler,
  ): EdgeApiRoute {
    method = method instanceof Array ? method : [method];
    this.handlers.push([method, edgehandler]);
    return this;
  }

  public get<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('get');
    return this.handle(
      'get',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public post<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('post');
    return this.handle(
      'post',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public put<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('put');
    return this.handle(
      'put',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public delete<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('delete');
    return this.handle(
      'delete',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public head<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('head');
    return this.handle(
      'head',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public patch<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('patch');
    return this.handle(
      'patch',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public options<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('options');
    return this.handle(
      'options',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public all<Req = unknown, Res = unknown>(
    edgehandler: EdgeHandler<Req, Res, Ctx>,
  ): EdgeApiRoute<Ctx> {
    this.allowedMethods.push('*');
    return this.handle(
      '*',
      edgehandler as EdgeHandler<any, any, {}>,
    ) as EdgeApiRoute<Ctx>;
  }

  public use<
    Req extends RequestData = RequestData,
    Res = any,
    Ctx2 extends {} = {},
  >(
    edgehandler: EdgeHandler<Req, Res, Ctx, Ctx2>,
    methods: string | string[] = '*',
  ): EdgeApiRoute<Ctx & Ctx2> {
    return this.handle(
      methods,
      edgehandler as EdgeHandler<RequestData, Res, {}>,
    ) as any as EdgeApiRoute<Ctx & Ctx2>;
  }

  private async request(
    req: NextEdgeApiRequest,
    event: NextFetchEvent,
    ctx: Ctx = {} as Ctx,
    skipChecks = false,
  ): Promise<symbol | NextResponse> {
    if (!event.sourcePage.startsWith(req.nextUrl.pathname))
      return NextResponse.next();
    if (!this.handlers.length) console.warn('No handlers for this route');
    if (
      !skipChecks &&
      !this.allowedMethods.includes(req.method.toLowerCase() || 'get') &&
      !this.allowedMethods.includes('*')
    ) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'method_not_allowed',
            message: `Method ${req.method} not allowed`,
          },
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            Allow: this.allowedMethods
              .map(method => method.toUpperCase())
              .join(', '),
          },
        },
      );
    }
    try {
      for (const [methods, edgehandler] of this.handlers) {
        if (
          methods[0] === '*' ||
          methods.includes(req.method?.toLowerCase() || 'get')
        ) {
          const result = await edgehandler(req, event, ctx, true);
          if (result !== EdgeApiRoute.NEXT) {
            if (result instanceof NextResponse) return result;
          }
        }
      }
      if (!skipChecks) return NextResponse.next();
      return EdgeApiRoute.NEXT;
    } catch (error) {
      if (skipChecks) throw error;
      if (error instanceof HttpError) {
        return new NextResponse(
          JSON.stringify({
            error: {
              code: error.statusCode,
              message: error.message,
            },
            data: error.data,
          }),
          {
            status: error.status,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      } else {
        return new NextResponse(
          JSON.stringify({
            error: {
              message: 'Internal Server Error',
              code: 'internal_server_error',
            },
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }
    }
  }
}
