"""Lista inicial de itens (fonte: planilha de compras do evento).

Estrutura: categorias (seções da lista) + itens.
A partir do painel, a coordenação pode renomear categorias, adicionar,
editar, resetar e excluir itens — então isto é só o ponto de partida.

Cada item: (nome, meta_numerica, unidade_texto, nome_da_categoria).
A unidade preserva o texto após o número ("pacotes de 1 kg" etc.).
"""

# (nome, ordem)
CATEGORIAS = [
    ("Proteínas", 1),
    ("Grãos e Mercearia", 2),
    ("Molhos e Temperos", 3),
    ("Hortifrúti", 4),
    ("Laticínios e Doces", 5),
    ("Bebidas", 6),
    ("Padaria e Sobremesas", 7),
]

ITENS = [
    # Proteínas
    ("Peito de frango", 36, "kg", "Proteínas"),
    ("Peixe", 48, "kg", "Proteínas"),
    ("Sobrecoxa", 48, "kg", "Proteínas"),
    ("Camarão", 15, "kg", "Proteínas"),
    ("Ovos", 60, "unidades", "Proteínas"),
    ("Presunto", 4, "kg", "Proteínas"),
    ("Queijo", 4, "kg", "Proteínas"),
    # Grãos e Mercearia
    ("Arroz", 36, "kg", "Grãos e Mercearia"),
    ("Feijão", 12, "kg", "Grãos e Mercearia"),
    ("Farinha de rosca", 8, "kg", "Grãos e Mercearia"),
    ("Farinha", 6, "kg", "Grãos e Mercearia"),
    ("Farinha de trigo", 5, "kg", "Grãos e Mercearia"),
    ("Batata palha", 10, "pacotes de 1 kg", "Grãos e Mercearia"),
    ("Óleo", 15, "L", "Grãos e Mercearia"),
    # Molhos e Temperos
    ("Molho de tomate", 3, "L", "Molhos e Temperos"),
    ("Catchup", 2, "L", "Molhos e Temperos"),
    ("Mostarda", 1, "L", "Molhos e Temperos"),
    ("Vinagre", 6, "garrafas", "Molhos e Temperos"),
    # Hortifrúti
    ("Pepino japonês", 18, "kg", "Hortifrúti"),
    ("Tomate", 21, "kg", "Hortifrúti"),
    ("Cenoura", 15, "kg", "Hortifrúti"),
    ("Beterraba", 15, "kg", "Hortifrúti"),
    ("Repolho", 12, "unidades", "Hortifrúti"),
    ("Alface", 30, "cabeças", "Hortifrúti"),
    ("Cebola", 10, "unidades", "Hortifrúti"),
    ("Alho", 15, "cabeças", "Hortifrúti"),
    # Laticínios e Doces
    ("Creme de leite", 42, "caixas", "Laticínios e Doces"),
    ("Leite condensado", 20, "caixas", "Laticínios e Doces"),
    ("Leite", 9, "caixas (12 unid. cada)", "Laticínios e Doces"),
    ("Margarina", 4, "potes", "Laticínios e Doces"),
    ("Doce de leite", 4, "potes", "Laticínios e Doces"),
    ("Nescau", 3, "pacotes", "Laticínios e Doces"),
    # Bebidas
    ("Café", 6, "pacotes", "Bebidas"),
    ("Suco", 14, "caixas", "Bebidas"),
    ("Suco de maracujá", 12, "garrafas", "Bebidas"),
    # Padaria e Sobremesas
    ("Bolo", 15, "formas", "Padaria e Sobremesas"),
    ("Pão caseiro/fatiado", 25, "unidades", "Padaria e Sobremesas"),
    ("Bolachas", 4, "kg", "Padaria e Sobremesas"),
]
