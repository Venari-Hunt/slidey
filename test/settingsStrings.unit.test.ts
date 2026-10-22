import { trIn } from "../src/domain/settingsStrings";

describe("trIn", () => {
    it("translates known text and generated labels", () => {
        expect(trIn("Server port", "pt-BR")).toBe("Porta do servidor");
        expect(trIn("### Heading 3", "pt-BR")).toBe("### Título 3");
        expect(trIn("Add preset", "pt-BR")).toBe("Adicionar predefinição");
        expect(trIn("Layout: deck default", "pt-BR")).toBe(
            "Layout: padrão da apresentação",
        );
        expect(trIn("Style: night (missing)", "pt-BR")).toBe(
            "Estilo: night (ausente)",
        );
    });
    it("keeps English and unknown text", () => {
        expect(trIn("Server port", "en")).toBe("Server port");
        expect(trIn("Something new", "pt-BR")).toBe("Something new");
    });
});
