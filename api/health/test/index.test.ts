import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { handler } from '../src/index';

describe('Health Check Handler', () => {
    it('returns 200 status code with CORS headers', async () => {
        const result: any = await handler(
            {} as APIGatewayProxyEventV2,
            {} as Context,
            {} as any
        );

        expect(result.statusCode).toBe(200);
        expect(result.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
        });

        const body = JSON.parse(result.body);
        expect(body).toEqual({
            message: 'pong'
        });
    });
});