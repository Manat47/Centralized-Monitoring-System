import { IsString, MaxLength, MinLength } from 'class-validator';

export class ValidateInvitationDto {
  @IsString()
  @MinLength(20)
  token!: string;
}

export class AcceptInvitationDto extends ValidateInvitationDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
