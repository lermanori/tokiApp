import { Router } from 'express';

import registerRouter from './auth/register';
import loginRouter from './auth/login';
import oauthRouter from './auth/oauth';
import profileRouter from './auth/profile';
import sessionRouter from './auth/session';
import verificationRouter from './auth/verification';
import passwordRouter from './auth/password';
import usersRouter from './auth/users';

const router = Router();

router.use(registerRouter);
router.use(loginRouter);
router.use(oauthRouter);
router.use(profileRouter);
router.use(sessionRouter);
router.use(verificationRouter);
router.use(passwordRouter);
router.use(usersRouter);

export default router;
