import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports that the API is healthy', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok' });
  });
});
