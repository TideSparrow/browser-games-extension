export async function loadMessages(locale) {
  const response = await fetch(new URL(`./_locales/${locale}/messages.json`, import.meta.url));
  if (!response.ok) throw new Error(`Unable to load language: ${locale}`);
  return response.json();
}

// Popup overrides use the same catalog and placeholders as native browser i18n.
export function formatMessage(entry, substitution = '') {
  return entry?.message.replace(/\$([a-z_]+)\$/gi, (placeholder, name) => {
    return entry.placeholders?.[name.toLowerCase()]?.content === '$1' ? substitution : placeholder;
  });
}
