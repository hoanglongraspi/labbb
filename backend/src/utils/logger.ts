import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'patient-portal-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
          const { timestamp, level, message, stack, ...meta } = info;
          const normalizedMessage =
            typeof message === 'string' ? message : JSON.stringify(message);
          const normalizedMeta =
            Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          const stackTrace = stack ? `\n${stack}` : '';
          return `${timestamp} ${level}: ${normalizedMessage}${normalizedMeta}${stackTrace}`;
        })
      )
    })
  );
}

export { logger };
