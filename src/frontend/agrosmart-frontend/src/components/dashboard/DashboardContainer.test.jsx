import { describe, expect, test, vi } from "vitest";

import { render, screen } from "@testing-library/react";

import { useQueryContext } from "../../context/QueryContext";
import DashboardContainer from "./DashboardContainer";

vi.mock("../../context/QueryContext", () => ({
  useQueryContext: vi.fn(),
}));

vi.mock("./PriceChart", () => ({
  default: ({ data }) => (
    <div data-testid="price-chart">{JSON.stringify(data)}</div>
  ),
}));

describe("DashboardContainer", () => {
  test("CP-UNIT-013: no muestra resultados en idle", () => {
    useQueryContext.mockReturnValue({
      status: "idle",
      result: null,
      error: null,
    });

    const { container } = render(<DashboardContainer />);

    expect(container).toBeEmptyDOMElement();
  });

  test("CP-UNIT-014: muestra la respuesta recibida", () => {
    useQueryContext.mockReturnValue({
      status: "success",
      result: {
        respuesta: "Precio actual: S/ 2.50",
      },
      error: null,
    });

    render(<DashboardContainer />);

    expect(screen.getByText("Precio actual: S/ 2.50")).toBeInTheDocument();
  });

  test("CP-UNIT-015: muestra ErrorState", () => {
    useQueryContext.mockReturnValue({
      status: "error",
      result: null,
      error: "n8n no está disponible",
    });

    render(<DashboardContainer />);

    expect(screen.getByText("n8n no está disponible")).toBeInTheDocument();
  });
});
