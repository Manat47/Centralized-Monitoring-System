import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum UserRoleFilterDto {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export enum UserStatusFilterDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRoleFilterDto)
  role?: UserRoleFilterDto;

  @IsOptional()
  @IsEnum(UserStatusFilterDto)
  status?: UserStatusFilterDto;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
