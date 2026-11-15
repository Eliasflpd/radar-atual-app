// Entrega ao app só as chaves PÚBLICAS do Supabase.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
}
