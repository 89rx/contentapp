import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column+', 
  
  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'flex flex-row w-full my-8 divide-x divide-gray-200' }), 0];
  },
});

export const Column = Node.create({
  name: 'column',
  content: 'block+', 
  
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'flex-1 px-6 focus:outline-none' }), 0];
  },
});