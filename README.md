# @baked-dev/next-api

Helper for next.js api routes and middleware

## Usage

### Basic 
Lambda
```ts
import { ApiRoute } from '@baked-dev/next-api/lambda';

export default ApiRoute.new()
  .get(async (req, res, ctx) => {
    return 'hello world';
  });
```
Edge
```ts
import { EdgeApiRoute } from '@baked-dev/next-api/edge';

export default EdgeApiRoute.new()
  .get(async (req, ev, ctx) => {
    return 'hello world';
  });
```
### With middleware
Lambda
```ts
import { ApiRoute, LambdaHandler } from '@baked-dev/next-api/lambda';
import mongoose from 'mongoose';

const withMongoose =
  (
    uri: string | undefined = process.env.MONGO_URI,
    options?: mongoose.ConnectOptions,
  ): LambdaHandler<any, any, {}, { mongoose: typeof mongoose }> =>
  async (_, _2, ctx) => {
    if (!uri) throw new Error('connection uri is not set');
    if (!client) {
      client = await mongoose.connect(uri, options);
    }
    ctx.mongoose = client;
    return ApiRoute.NEXT;
  };

export default ApiRoute.new()
  .use(withMongoose())
  .get(async (req, res, ctx) => {
    ctx.mongoose; // typescript knows about the mongoose type here by inferring it from the middleware
    return 'hello world';
  });
```
Edge
```ts
import { EdgeApiRoute, EdgeHandler } from '@baked-dev/next-api/edge';
import { HttpError } from '@baked-dev/next-api/errors';
import { verify } from 'jsonwebtoken';

const withAuth =
  <R extends boolean = true>(
    rejectUnauthorized?: R,
  ): EdgeHandler<
    any,
    any,
    {},
    R extends true ? { account: string } : { account?: string }
  > =>
  async (req, res, ctx) => {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      if (rejectUnauthorized !== false)
        throw new HttpError(401, 'Unauthorized', 'unauthorized');
      else return EdgeApiRoute.NEXT;
    }
    try {
      const { sub } = verify(token, '', { algorithms: ['HS256'] }) as {
        sub: string;
      };
      ctx.account = sub.toLowerCase();
      return EdgeApiRoute.NEXT;
    } catch {
      if (rejectUnauthorized !== false)
        throw new HttpError(401, 'Unauthorized', 'unauthorized');
      else return EdgeApiRoute.NEXT;
    }
  };

export default EdgeApiRoute.new(['get'])  // if there are no specific handlers, specify the allowed methods here
  .use(withAuth())
```
### Api Route with middleware type chaining, concept same for both Lambda and Edge
```ts
import { ApiRoute, LambdaHandler } from '@baked-dev/next-api/lambda';
import mongoose from 'mongoose';

const withMiddleware1: LambdaHandler<any, any, {}, { test: string }> =
  async (_, _2, ctx) => {
    ctx.test = "test"
    return ApiRoute.NEXT;
  };

const withMiddleware2: LambdaHandler<any, any, { test: string }, { test2: number }> =
  async (_, _2, ctx) => {
    ctx.test2 = parseInt(ctx.test); // ctx.test is typed as a string though the 3rd type prop in LambdaHandler
    return ApiRoute.NEXT;
  };

export default ApiRoute.new()
  .use(withMiddleware2()) // this will error because middleware2 expects ctx.test to be a string via the 3rd type param
  .use(withMiddleware1()) // adds ctx.test to the routes commulative context type
  .use(withMiddleware2()) // this will now work because middleware1 has typed ctx.test as a string
  .get(async (req, res, ctx) => {
    ctx.test; // string
    ctx.test2;  // number
    return 'hello world';
  });
```