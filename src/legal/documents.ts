// Documentos legais estaticos (pt-BR) do NotifyStudio.
// Conteudo: sem coleta de dados, offline-first, dados simulados, aviso de
// uso etico. Alteracoes de conteudo exigem bump da versao do termo para
// forcar novo aceite (guardrail do handoff).

export const TERMS_VERSION = "1.0.0";

export type LegalDocument = {
  readonly id: "privacy" | "terms";
  readonly title: string;
  readonly version: string;
  readonly updatedAt: string;
  readonly sections: readonly { readonly heading: string; readonly body: string }[];
};

export const PRIVACY_POLICY: LegalDocument = {
  id: "privacy",
  title: "Política de Privacidade",
  version: TERMS_VERSION,
  updatedAt: "2026-08-24",
  sections: [
    {
      heading: "Resumo",
      body:
        "O NotifyStudio não coleta, armazena nem transmite dados pessoais. " +
        "Todo o conteúdo produzido no aplicativo permanece apenas no seu aparelho.",
    },
    {
      heading: "Funcionamento offline",
      body:
        "O aplicativo funciona integralmente offline. Projetos, preferências e " +
        "registros de aceites são gravados localmente no armazenamento do " +
        "aparelho e não são enviados a nenhum servidor.",
    },
    {
      heading: "Dados simulados",
      body:
        "Todas as notificações, vendas e valores exibidos são simulados e " +
        "gerados apenas para demonstração. Nenhum dado real de clientes, " +
        "pedidos ou transações é utilizado.",
    },
    {
      heading: "Exclusão de dados",
      body:
        "Como os dados ficam apenas no aparelho, você pode excluí-los a " +
        "qualquer momento desinstalando o aplicativo ou removendo os projetos " +
        "dentro da galeria do NotifyStudio.",
    },
    {
      heading: "Contato",
      body:
        "Dúvidas sobre esta política podem ser enviadas pelo canal de suporte " +
        "informado na página do aplicativo na loja.",
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  id: "terms",
  title: "Termos de Uso",
  version: TERMS_VERSION,
  updatedAt: "2026-08-24",
  sections: [
    {
      heading: "Natureza do aplicativo",
      body:
        "O NotifyStudio é uma ferramenta de criação de demonstrações visuais " +
        "de notificações de vendas. Todo o conteúdo gerado é fictício e " +
        "identificado como simulação.",
    },
    {
      heading: "Uso ético",
      body:
        "Você concorda a não utilizar o aplicativo para enganar pessoas, " +
        "simular resultados reais com intuito de fraude, induzir consumidores " +
        "ao erro ou violar leis aplicáveis. As demonstrações devem ser " +
        "apresentadas sempre com o aviso obrigatório de conteúdo simulado " +
        "embutido nas imagens e vídeos exportados.",
    },
    {
      heading: "Aviso obrigatório",
      body:
        "Todos os exports carregam o aviso \u201cDemonstração — dados simulados\u201d. " +
        "Não é permitido remover, ocultar ou adulterar esse aviso.",
    },
    {
      heading: "Propriedade intelectual",
      body:
        "Os estilos visuais são inspirações genéricas de plataformas e não " +
        "reproduzem marcas, logotipos ou identidades visuais de terceiros. " +
        "Você é responsável pelo conteúdo textual que inserir nos projetos.",
    },
    {
      heading: "Ausência de garantias",
      body:
        "O aplicativo é fornecido no estado em que se encontra, sem " +
        "garantias de disponibilidade contínua ou adequação a finalidades " +
        "específicas.",
    },
    {
      heading: "Alterações destes termos",
      body:
        "Estes termos podem ser atualizados em versões futuras. Alterações " +
        "relevantes exibirão nova tela de aceite com a versão revisada, " +
        "registrada localmente no seu aparelho.",
    },
  ],
};
