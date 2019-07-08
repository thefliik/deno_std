// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.
import { Decoder, PromiseDecoder } from "./decoder.ts";
import {
  DecoderError,
  DecoderSuccess,
  areDecoderErrors,
  DecoderResult
} from "./decoder_result.ts";
import { ok, errorLocation } from "./_util.ts";
import { ComposeDecoderOptions, applyOptionsToDecoderErrors } from "./util.ts";

const decoderName = "isArray";

function nonArrayError(
  value: unknown,
  options: IsArrayOptions = {}
): DecoderError[] {
  return applyOptionsToDecoderErrors(
    [
      new DecoderError(value, "must be an array", {
        decoderName
      })
    ],
    options
  );
}

function childError(
  child: DecoderError,
  value: unknown,
  key: number
): DecoderError {
  const location = errorLocation(key, child.location);

  return new DecoderError(
    value,
    `invalid element [${key}] > ${child.message}`,
    {
      decoderName,
      child,
      location,
      key
    }
  );
}

export type IsArrayOptions = ComposeDecoderOptions;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isArray<R = any>(options?: IsArrayOptions): Decoder<R[]>;

export function isArray<R>(
  decoder: Decoder<R>,
  options?: IsArrayOptions
): Decoder<R[]>;

export function isArray<R>(
  decoder: PromiseDecoder<R>,
  options?: IsArrayOptions
): PromiseDecoder<R[]>;

export function isArray<R>(
  decoder?: Decoder<R> | PromiseDecoder<R> | IsArrayOptions,
  options: IsArrayOptions = {}
): Decoder<R[]> | PromiseDecoder<R[]> {
  if (!(decoder instanceof Decoder || decoder instanceof PromiseDecoder)) {
    return new Decoder<R[]>(
      (input): DecoderResult<R[]> =>
        Array.isArray(input)
          ? ok<R[]>(input.slice())
          : nonArrayError(input, options)
    );
  }
  if (decoder instanceof PromiseDecoder) {
    if (options.allErrors) {
      return new PromiseDecoder(
        async (input): Promise<DecoderResult<R[]>> => {
          if (!Array.isArray(input)) return nonArrayError(input, options);

          let hasError = false;

          const results = await Promise.all(
            input.map(
              async (item): Promise<DecoderResult<R>> => {
                const result = await decoder.decode(item);

                if (!hasError && areDecoderErrors(result)) {
                  hasError = true;
                }

                return result;
              }
            )
          );

          if (hasError) {
            const errors: DecoderError[] = [];

            results.forEach(
              (result, index): void => {
                if (Array.isArray(result)) {
                  errors.push(
                    ...result.map(
                      (error): DecoderError => childError(error, input, index)
                    )
                  );
                }
              }
            );

            return applyOptionsToDecoderErrors(errors, options);
          }

          const elements = results.map(
            (result): R => (result as DecoderSuccess<R>).value
          );

          return ok(elements);
        }
      );
    }

    return new PromiseDecoder(
      async (input): Promise<DecoderResult<R[]>> => {
        if (!Array.isArray(input)) return nonArrayError(input, options);

        const elements: R[] = [];
        let index = -1;

        for (const el of input) {
          index++;

          const result = await decoder.decode(el);

          if (areDecoderErrors(result)) {
            const errors = result.map(
              (error): DecoderError => childError(error, input, index)
            );

            return applyOptionsToDecoderErrors(errors, options);
          }

          elements.push(result.value);
        }

        return ok(elements);
      }
    );
  }

  return new Decoder(
    (input): DecoderResult<R[]> => {
      if (!Array.isArray(input)) return nonArrayError(input, options);

      const elements: R[] = [];
      let index = -1;

      const allErrors: DecoderError[] = [];

      for (const el of input) {
        index++;

        const result = decoder.decode(el);

        if (areDecoderErrors(result)) {
          const errors = result.map(
            (error): DecoderError => childError(error, input, index)
          );

          if (!options.allErrors) {
            return applyOptionsToDecoderErrors(errors, options);
          }

          allErrors.push(...errors);
          continue;
        }

        elements.push(result.value);
      }

      if (allErrors.length > 0) {
        return applyOptionsToDecoderErrors(allErrors, options);
      }

      return ok(elements);
    }
  );
}