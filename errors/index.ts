export class HttpError extends Error {
  constructor(
    public status: number,
    public message: string,
    public statusCode: string,
    public data?: any,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "The requested resource couldn't be found") {
    super(404, message, 'not_found');
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request') {
    super(400, message, 'bad_request');
  }
}
