import { useEffect, useRef } from 'react';

/**
 * Move o foco para o título da tela quando ela é montada.
 *
 * As telas são trocadas condicionalmente, o que **desmonta** o elemento que tinha o
 * foco — e o foco cai no `<body>`. Quem navega por teclado ou leitor de tela fica
 * sem saber que a tela mudou: o leitor recomeça a leitura do documento do zero, ou
 * anuncia o skip-link, que é a primeira coisa da página.
 *
 * Focar o `<h1>` da nova tela é o padrão recomendado: ele anuncia o nome do
 * contexto ("cacaPalavras", "Estatísticas") e devolve o controle ao conteúdo.
 */
export function useFocusOnMount<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return ref;
}
