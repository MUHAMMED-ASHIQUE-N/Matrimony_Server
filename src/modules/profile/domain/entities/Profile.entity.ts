/**
 * Profile Entity - Profile Domain Aggregate Root
 * 
 * @description Represents a user profile in the matrimony domain.
 * Contains personal info, preferences, and matching logic.
 * 
 * @pattern DDD Entity - Encapsulates profile business rules
 */

export interface ProfileProps {
    profileId: string;
    userId: string;
    firstName: string;
    lastName: string;
    gender: 'Male' | 'Female' | 'Other';
    profileCreatedFor: string;
    contact: string | null;
    dateOfBirth: Date | null;
    heightCm: number | null;
    weightKg: number | null;
    maritalStatus: string | null;
    caste: string | null;
    religion: string | null;
    motherTongue: string | null;
    education: string | null;
    college: string | null;
    passoutYear: number | null;
    occupation: string | null;
    company: string | null;
    annualIncome: string | null;
    presentCountry: string | null;
    financialStatus: string | null;
    tagline: string | null;
    aboutMe: string | null;
    dietPreference: string | null;
    smoking: string | null;
    drinking: string | null;
    hobbies: string[];
    interests: string[];
    userProfile: string | null;
    photos: string[];
    partnerMinAge: number | null;
    partnerMaxAge: number | null;
    partnerMinHeight: number | null;
    partnerMaxHeight: number | null;
    partnerMaritalPreference: string | null;
    partnerReligionPreference: string | null;
    partnerDistancePreferenceKm: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export class Profile {
    private props: ProfileProps;

    private constructor(props: ProfileProps) {
        this.props = Object.freeze({ ...props });
    }

    // Getters
    get profileId(): string { return this.props.profileId; }
    get userId(): string { return this.props.userId; }
    get firstName(): string { return this.props.firstName; }
    get lastName(): string { return this.props.lastName; }
    get fullName(): string { return `${this.firstName} ${this.lastName}`.trim(); }
    get gender(): 'Male' | 'Female' | 'Other' { return this.props.gender; }
    get profileCreatedFor(): string { return this.props.profileCreatedFor; }
    get dateOfBirth(): Date | null { return this.props.dateOfBirth; }
    get heightCm(): number | null { return this.props.heightCm; }
    get weightKg(): number | null { return this.props.weightKg; }
    get religion(): string | null { return this.props.religion; }
    get caste(): string | null { return this.props.caste; }
    get occupation(): string | null { return this.props.occupation; }
    get presentCountry(): string | null { return this.props.presentCountry; }
    get photos(): string[] { return this.props.photos; }
    get userProfile(): string | null { return this.props.userProfile; }
    get tagline(): string | null { return this.props.tagline; }
    get createdAt(): Date { return this.props.createdAt; }
    get updatedAt(): Date { return this.props.updatedAt; }

    // Partner preference getters
    get partnerMinAge(): number | null { return this.props.partnerMinAge; }
    get partnerMaxAge(): number | null { return this.props.partnerMaxAge; }

    /**
     * Calculate age from date of birth
     * Time Complexity: O(1)
     */
    get age(): number | null {
        if (!this.dateOfBirth) return null;

        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }

    /**
     * Get target gender for matching
     * Time Complexity: O(1)
     */
    get targetGender(): 'Male' | 'Female' | 'Other' {
        return this.gender === 'Male' ? 'Female' : 'Male';
    }

    /**
     * Create from database row (snake_case to camelCase)
     */
    static fromPersistence(row: Record<string, unknown>): Profile {
        return new Profile({
            profileId: row.profile_id as string,
            userId: row.user_id as string,
            firstName: row.first_name as string,
            lastName: (row.last_name as string) || '',
            gender: row.gender as 'Male' | 'Female' | 'Other',
            profileCreatedFor: row.profile_created_for as string,
            contact: row.contact as string | null,
            dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth as string) : null,
            heightCm: row.height_cm ? Number(row.height_cm) : null,
            weightKg: row.weight_kg ? Number(row.weight_kg) : null,
            maritalStatus: row.marital_status as string | null,
            caste: row.caste as string | null,
            religion: row.religion as string | null,
            motherTongue: row.mother_tongue as string | null,
            education: row.education as string | null,
            college: row.college as string | null,
            passoutYear: row.passout_year ? Number(row.passout_year) : null,
            occupation: row.occupation as string | null,
            company: row.company as string | null,
            annualIncome: row.annual_income as string | null,
            presentCountry: row.present_country as string | null,
            financialStatus: row.financial_status as string | null,
            tagline: row.tagline as string | null,
            aboutMe: row.about_me as string | null,
            dietPreference: row.diet_preference as string | null,
            smoking: row.smoking as string | null,
            drinking: row.drinking as string | null,
            hobbies: (row.hobbies as string[]) || [],
            interests: (row.interests as string[]) || [],
            userProfile: row.user_profile as string | null,
            photos: (row.photos as string[]) || [],
            partnerMinAge: row.partner_min_age ? Number(row.partner_min_age) : null,
            partnerMaxAge: row.partner_max_age ? Number(row.partner_max_age) : null,
            partnerMinHeight: row.partner_min_height ? Number(row.partner_min_height) : null,
            partnerMaxHeight: row.partner_max_height ? Number(row.partner_max_height) : null,
            partnerMaritalPreference: row.partner_marital_preference as string | null,
            partnerReligionPreference: row.partner_religion_preference as string | null,
            partnerDistancePreferenceKm: row.partner_distance_preference_km ? Number(row.partner_distance_preference_km) : null,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        });
    }

    /**
     * Convert to public DTO (for viewing other profiles)
     */
    toPublicDTO(): Record<string, unknown> {
        return {
            profileId: this.profileId,
            userId: this.userId,
            firstName: this.firstName,
            lastName: this.lastName,
            gender: this.gender,
            age: this.age,
            heightCm: this.heightCm,
            weightKg: this.weightKg,
            religion: this.religion,
            caste: this.caste,
            maritalStatus: this.props.maritalStatus,
            education: this.props.education,
            occupation: this.occupation,
            company: this.props.company,
            annualIncome: this.props.annualIncome,
            presentCountry: this.presentCountry,
            tagline: this.props.tagline,
            aboutMe: this.props.aboutMe,
            hobbies: this.props.hobbies,
            interests: this.props.interests,
            userProfile: this.userProfile,
            photos: this.photos
        };
    }

    /**
     * Convert to full DTO (for own profile)
     */
    toFullDTO(): Record<string, unknown> {
        return {
            ...this.toPublicDTO(),
            contact: this.props.contact,
            dateOfBirth: this.dateOfBirth?.toISOString().split('T')[0],
            motherTongue: this.props.motherTongue,
            college: this.props.college,
            passoutYear: this.props.passoutYear,
            financialStatus: this.props.financialStatus,
            dietPreference: this.props.dietPreference,
            smoking: this.props.smoking,
            drinking: this.props.drinking,
            partnerMinAge: this.partnerMinAge,
            partnerMaxAge: this.partnerMaxAge,
            partnerMinHeight: this.props.partnerMinHeight,
            partnerMaxHeight: this.props.partnerMaxHeight,
            partnerMaritalPreference: this.props.partnerMaritalPreference,
            partnerReligionPreference: this.props.partnerReligionPreference,
            partnerDistancePreferenceKm: this.props.partnerDistancePreferenceKm,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Convert to match card DTO (minimal info for list view)
     */
    toMatchCardDTO(): Record<string, unknown> {
        return {
            profileId: this.profileId,
            userId: this.userId,
            firstName: this.firstName,
            lastName: this.lastName,
            age: this.age,
            occupation: this.occupation,
            presentCountry: this.presentCountry,
            userProfile: this.userProfile,
            tagline: this.props.tagline
        };
    }
}
