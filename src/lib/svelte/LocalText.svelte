<script lang="ts">
  import { localText } from '../core/index.ts';

  let {
    slug,
    scope = undefined,
    entityId = undefined,
  }: {
    slug: string;
    scope?: string;
    entityId?: number;
  } = $props();
</script>

{localText(slug, scope, entityId)}
