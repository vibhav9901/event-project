import { getPlanHandler } from '../../../server/container';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return getPlanHandler()(request);
}
