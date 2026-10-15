import { describe, expect, test } from "vitest";
import {
    render,
    screen
} from "@testing-library/react";

import ErrorState from "./ErrorState";

describe("ErrorState", () => {
    test("CP-UNIT-012: muestra un error amigable", () => {
        render(
            <ErrorState message="Tiempo de espera agotado" />
        );

        expect(
            screen.getByText(
                "No se pudo procesar la consulta."
            )
        ).toBeInTheDocument();

        expect(
            screen.getByText(
                "Tiempo de espera agotado"
            )
        ).toBeInTheDocument();
    });
});
