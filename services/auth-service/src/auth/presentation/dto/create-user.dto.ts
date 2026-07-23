import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum UserRoleDto {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @IsEnum(UserRoleDto)
  role!: UserRoleDto;
}
