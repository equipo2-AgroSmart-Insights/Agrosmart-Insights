import {
    beforeEach,
    describe,
    expect,
    test,
    vi
} from "vitest";

import {
    act,
    renderHook
} from "@testing-library/react";

import { sendNLQQuery } from "../services/n8nClient";
import { useQueryContext } from "../context/QueryContext";
import { useNLQQuery } from "./useNLQQuery";

vi.mock("../services/n8nClient", () => ({
    sendNLQQuery: vi.fn()
}));

vi.mock("../context/QueryContext", () => ({
    useQueryContext: vi.fn()
}));

describe("useNLQQuery", () => {
    const setStatus = vi.fn();
    const setResult = vi.fn();
    const setError = vi.fn();

    beforeEach(() => {
        useQueryContext.mockReturnValue({
            setStatus,
            setResult,
            setError
        });
    });

    test("CP-UNIT-005: termina correctamente en success", async () => {
        const respuesta = {
            respuesta: "La papa cuesta S/ 2.50"
        };

        sendNLQQuery.mockResolvedValue(respuesta);

        const { result } = renderHook(() =>
            useNLQQuery()
        );

        await act(async () => {
            await result.current.runQuery(
                "¿Cuál es el precio de la papa?"
            );
        });

        expect(setStatus.mock.calls).toEqual([
            ["loading"],
            ["success"]
        ]);

        expect(sendNLQQuery).toHaveBeenCalledWith(
            "¿Cuál es el precio de la papa?"
        );

        expect(setResult).toHaveBeenCalledWith(
            respuesta
        );
    });

    test("CP-UNIT-006: guarda el error cuando n8n falla", async () => {
        sendNLQQuery.mockRejectedValue(
            new Error("Tiempo de espera agotado")
        );

        const { result } = renderHook(() =>
            useNLQQuery()
        );

        await act(async () => {
            await result.current.runQuery(
                "Consulta de prueba"
            );
        });

        expect(setStatus.mock.calls).toEqual([
            ["loading"],
            ["error"]
        ]);

        expect(setError).toHaveBeenCalledWith(
            "Tiempo de espera agotado"
        );

        expect(setResult).not.toHaveBeenCalled();
    });
});