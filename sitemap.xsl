<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="es">
<head>
  <title>Sitemap — andresbotta.dev</title>
  <meta name="robots" content="noindex, nofollow"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Space Grotesk',system-ui,sans-serif;background:#06080f;color:#fafafa;padding:2rem;max-width:1200px;margin:0 auto}
    h1{font-size:1.5rem;font-weight:600;margin-bottom:.25rem}
    .subtitle{color:#a1a1aa;font-size:.9rem;margin-bottom:2rem}
    .subtitle span{color:#3b82f6}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:.75rem 1rem;font-size:.75rem;font-weight:500;color:#a1a1aa;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #27272a}
    td{padding:.6rem 1rem;border-bottom:1px solid #1a1a2e;font-size:.85rem}
    tr:hover td{background:#0c0e18}
    a{color:#3b82f6;text-decoration:none}
    a:hover{text-decoration:underline}
    .freq,.prio{color:#a1a1aa}
    .date{color:#a1a1aa;white-space:nowrap}
  </style>
</head>
<body>
  <h1>Sitemap</h1>
  <p class="subtitle">andresbotta.dev — <span><xsl:value-of select="count(s:urlset/s:url)"/> URLs</span></p>
  <table>
    <thead>
      <tr>
        <th>URL</th>
        <th>Última modificación</th>
        <th>Frecuencia</th>
        <th>Prioridad</th>
      </tr>
    </thead>
    <tbody>
      <xsl:for-each select="s:urlset/s:url">
        <xsl:sort select="s:priority" order="descending"/>
        <tr>
          <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
          <td class="date"><xsl:value-of select="s:lastmod"/></td>
          <td class="freq"><xsl:value-of select="s:changefreq"/></td>
          <td class="prio"><xsl:value-of select="s:priority"/></td>
        </tr>
      </xsl:for-each>
    </tbody>
  </table>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
