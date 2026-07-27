import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum UpdateUserRoleDto {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsEnum(UpdateUserRoleDto)
  role?: UpdateUserRoleDto;
}
