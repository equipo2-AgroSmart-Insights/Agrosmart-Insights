import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { QueryProvider, useQueryContext } from "./QueryContext";

const wrapper = ({ children }) => <QueryProvider>{children}</QueryProvider>;

describe("QueryContext", () => {
  test("CP-UNIT-007: inicia con estado idle", () => {
    const { result } = renderHook(() => useQueryContext(), { wrapper });

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test("CP-UNIT-008: actualiza el estado compartido", () => {
    const { result } = renderHook(() => useQueryContext(), { wrapper });

    act(() => {
      result.current.setStatus("success");

      result.current.setResult({
        respuesta: "Precio de la papa",
      });
    });

    expect(result.current.status).toBe("success");

    expect(result.current.result).toEqual({
      respuesta: "Precio de la papa",
    });
  });

  test("CP-UNIT-009: exige utilizar QueryProvider", () => {
    expect(() => {
      renderHook(() => useQueryContext());
    }).toThrow("useQueryContext debe usarse dentro de QueryProvider");
  });
});
