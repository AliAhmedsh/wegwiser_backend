const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.status = 401;
    error.message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    error.status = 403;
    error.message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    error.status = 404;
    error.message = 'Resource not found';
  } else if (err.code === '23505') {
    error.status = 409;
    error.message = 'Resource already exists';
  } else if (err.code === '23503') {
    error.status = 400;
    error.message = 'Invalid reference';
  }

  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.status).json({
    error: {
      message: error.message,
      status: error.status,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = {
  errorHandler
};
