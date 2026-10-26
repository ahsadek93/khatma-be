import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

describe('UsersController', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const users = {
    getProfile: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  const user = { id: 'user-1', email: 'person@example.com', displayName: 'Person' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({
        secret: 'test-secret-that-is-at-least-32-bytes-long',
        signOptions: { issuer: 'khatma-api', audience: 'khatma-mobile' },
      })],
      controllers: [UsersController],
      providers: [JwtAuthGuard, { provide: UsersService, useValue: users }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards(module.get(JwtAuthGuard));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    jwt = module.get(JwtService);
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  async function token(id = user.id, email = user.email) {
    return jwt.signAsync({ sub: id, email });
  }

  it('requires authentication to read the current profile', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
    users.getProfile.mockResolvedValue(user);
    await request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${await token()}`).expect(200, user);
    expect(users.getProfile).toHaveBeenCalledWith(user.id);
  });

  it('updates only the authenticated user display name', async () => {
    users.updateDisplayName.mockResolvedValue({ ...user, displayName: 'New Name' });
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${await token()}`)
      .send({ displayName: '  New Name  ' })
      .expect(200, { ...user, displayName: 'New Name' });
    expect(users.updateDisplayName).toHaveBeenCalledWith(user.id, 'New Name');
  });

  it('rejects invalid profile updates', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${await token()}`)
      .send({ displayName: ' ' })
      .expect(400);
  });
});
