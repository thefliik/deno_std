// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.
import { test, runTests } from "../testing/mod.ts";
import { assertEquals } from "../testing/asserts.ts";
import {
  assertDecodesToSuccess,
  assertDecodesToErrors,
  assertDecoder,
  assertPromiseDecoder
} from "./test_util.ts";
import { PromiseDecoder } from "./decoder.ts";
import { isMatchForPredicate } from "./is_match_for_predicate.ts";
import { DecoderSuccess, DecoderError } from "./decoder_result.ts";

/**
 * isMatchForPredicate()
 */

test({
  name: "init isMatchForPredicate()",
  fn: (): void => {
    assertDecoder(isMatchForPredicate((): boolean => true));
    assertDecoder(isMatchForPredicate((): boolean => true));

    assertPromiseDecoder(
      isMatchForPredicate((): boolean => false, { promise: true })
    );
    assertPromiseDecoder(
      isMatchForPredicate((): Promise<boolean> => Promise.resolve(false), {
        promise: true
      })
    );
  }
});

test({
  name: "isMatchForPredicate(any => boolean)",
  fn: (): void => {
    const decoder = isMatchForPredicate((v): boolean => typeof v === "string");
    const msg = "failed custom check";

    for (const item of ["0", "two"]) {
      assertDecodesToSuccess(decoder, item, new DecoderSuccess(item));
    }

    for (const item of [0.123, true, {}, null, undefined]) {
      assertDecodesToErrors(decoder, item, [
        new DecoderError(item, msg, {
          decoderName: "isMatchForPredicate"
        })
      ]);
    }
  }
});

test({
  name: "async isMatchForPredicate(any => boolean, {promise: true})",
  fn: async (): Promise<void> => {
    const decoder = isMatchForPredicate((v): boolean => typeof v === "string", {
      promise: true
    });

    const msg = "failed custom check";

    assertEquals(decoder instanceof PromiseDecoder, true);

    for (const item of ["0", "two"]) {
      await assertDecodesToSuccess(decoder, item, new DecoderSuccess(item));
    }

    for (const item of [0.123, true, {}, null, undefined]) {
      await assertDecodesToErrors(decoder, item, [
        new DecoderError(item, msg, {
          decoderName: "isMatchForPredicate"
        })
      ]);
    }
  }
});

runTests();