import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column+', 
  
  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // FIX: Removed gap, added 'divide-x' to create a subtle vertical line between columns
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'flex flex-col sm:flex-row w-full my-8 sm:divide-x divide-gray-200' }), 0];
  },
});

export const Column = Node.create({
  name: 'column',
  content: 'block+', 
  
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // FIX: Removed the card background, shadow, and borders. Just clean padding.
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'flex-1 px-6 focus:outline-none' }), 0];
  },
});