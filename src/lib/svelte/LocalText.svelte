<script lang="ts">
  import { getDictionary } from './context.svelte.ts';

  let {
    slug,
    scope = undefined,
    entityId = undefined,
  }: {
    slug: string;
    scope?: string | null;
    entityId?: number | string | null;
  } = $props();

  const dictionary = getDictionary();
</script>

{dictionary.localText(slug, scope, entityId)}
