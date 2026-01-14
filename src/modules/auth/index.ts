// Domain
export { User } from './domain/entities/User.entity';

// Application
export { AuthService } from './application/services/AuthService';
export { TokenService, type TokenPair, type TokenPayload } from './application/services/TokenService';
export type {
    IAuthRepository,
    RegisterRequestDTO,
    RegisterResponseDTO,
    VerifyOtpRequestDTO,
    VerifyOtpResponseDTO,
    LoginRequestDTO,
    LoginResponseDTO
} from './application/interfaces';

// Infrastructure
export { AuthRepositoryPostgres } from './infrastructure/AuthRepository.postgres';

// Presentation
export { default as authRoutes } from './presentation/auth.routes';
