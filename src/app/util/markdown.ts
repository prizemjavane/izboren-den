import { marked, RendererObject } from 'marked';

export function markedConfig() {
  const renderer = {
    link(href: any, _title: any, _text: any) {
      const link = marked.Renderer.prototype.link.call(this, href);
      return link.replace('<a', "<a target='_blank' class='no-underline' ");
    },
  } as RendererObject;

  return { renderer: renderer };
}
