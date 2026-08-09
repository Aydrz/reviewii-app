export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'online',
    name: 'Reviewii NestJS API (Vercel Serverless)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
