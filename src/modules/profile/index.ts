// Domain
export { Profile } from './domain/entities/Profile.entity';

// Application
export { ProfileService } from './application/services/ProfileService';
export type {
    IProfileRepository,
    MatchCriteria,
    ProfileCursor,
    CreateProfileDTO,
    ProfileMatchResponseDTO
} from './application/interfaces';

// Infrastructure
export { ProfileRepositoryPostgres } from './infrastructure/ProfileRepository.postgres';

// Presentation
export { default as profileRoutes } from './presentation/profile.routes';
