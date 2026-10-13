"""Gera o relatório MARTT de Instagram a partir de um JSON de dados.

Uso: python3 analises-instagram/gerar.py analises-instagram/clientes/<cliente>/<AAAA-MM>.json
Saída: o mesmo caminho com extensão .html, pronto para publicar.
"""
import base64
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent
MODELO = RAIZ / "modelo.html"
LOGO = RAIZ.parent / "marca" / "martt-logo-faixa.jpg"

OBRIGATORIOS = ["cliente", "periodo", "proximo_periodo", "objetivo", "veredito", "kpis",
                 "funcionou", "travou", "ajustes", "metas"]


def main(caminho):
    origem = pathlib.Path(caminho)
    dados = json.loads(origem.read_text(encoding="utf-8"))
    faltando = [k for k in OBRIGATORIOS if not dados.get(k)]
    if faltando:
        sys.exit("Faltam campos no JSON: " + ", ".join(faltando))

    # notas internas ficam só no JSON; o relatório vai para o cliente
    dados.pop("faltou", None)

    logo = "data:image/jpeg;base64," + base64.b64encode(LOGO.read_bytes()).decode()
    # "</" fechado dentro do <script> quebraria a página
    bloco = json.dumps(dados, ensure_ascii=False, indent=1).replace("</", "<\\/")
    html = MODELO.read_text(encoding="utf-8").replace("__LOGO__", logo).replace("__DADOS__", bloco)
    html = html.replace("<title>Análise Instagram MARTT</title>", f"<title>{dados['cliente']} {dados.get('mes', '')}</title>", 1)

    destino = origem.with_suffix(".html")
    destino.write_text(html, encoding="utf-8")
    print(destino)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
