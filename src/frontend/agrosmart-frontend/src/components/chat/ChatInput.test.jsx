import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "./ChatInput";

describe("ChatInput", () => {
    test("CP-UNIT-001: muestra el texto y el botón Consultar", () => {
        render(
            <ChatInput
                value="Precio de la papa"
                onChange={vi.fn()}
                onSubmit={vi.fn()}
            />
        );

        expect(
            screen.getByRole("textbox")
        ).toHaveValue("Precio de la papa");

        expect(
            screen.getByRole("button", {
                name: /consultar/i
            })
        ).toBeInTheDocument();
    });

    test("CP-UNIT-002: captura los cambios del texto", () => {
        const onChange = vi.fn();

        render(
            <ChatInput
                value=""
                onChange={onChange}
                onSubmit={vi.fn()}
            />
        );

        fireEvent.change(screen.getByRole("textbox"), {
            target: {
                value: "¿Cuál es el precio de la papa?"
            }
        });

        expect(onChange).toHaveBeenCalledWith(
            "¿Cuál es el precio de la papa?"
        );
    });

    test("CP-UNIT-003: no envía una pregunta vacía", async () => {
        const usuario = userEvent.setup();
        const onSubmit = vi.fn();

        render(
            <ChatInput
                value="   "
                onChange={vi.fn()}
                onSubmit={onSubmit}
            />
        );

        await usuario.click(
            screen.getByRole("button", {
                name: /consultar/i
            })
        );

        expect(onSubmit).not.toHaveBeenCalled();
    });

    test("CP-UNIT-004: envía una pregunta válida", async () => {
        const usuario = userEvent.setup();
        const onSubmit = vi.fn();

        render(
            <ChatInput
                value="¿Cuál es el precio de la papa?"
                onChange={vi.fn()}
                onSubmit={onSubmit}
            />
        );

        await usuario.click(
            screen.getByRole("button", {
                name: /consultar/i
            })
        );

        expect(onSubmit).toHaveBeenCalledOnce();
    });
});