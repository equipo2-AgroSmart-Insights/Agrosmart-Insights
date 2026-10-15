import {
    describe,
    expect,
    test,
    vi
} from "vitest";

import {
    render,
    screen
} from "@testing-library/react";

import { useQueryContext } from "../../context/QueryContext";
import LoadingIndicator from "./LoadingIndicator";

vi.mock("../../context/QueryContext", () => ({
    useQueryContext: vi.fn()
}));

describe("LoadingIndicator", () => {
    test("CP-UNIT-010: aparece durante loading", () => {
        useQueryContext.mockReturnValue({
            status: "loading"
        });

        render(<LoadingIndicator />);

        expect(
            screen.getByText(/analizando tu consulta/i)
        ).toBeInTheDocument();
    });

    test("CP-UNIT-011: no aparece durante success", () => {
        useQueryContext.mockReturnValue({
            status: "success"
        });

        const { container } = render(
            <LoadingIndicator />
        );

        expect(container).toBeEmptyDOMElement();
    });
});