import { ArrayUnique, IsArray, IsEmail, IsString } from 'class-validator';

export class UpdateNotificationRecipientsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsEmail({}, { each: true })
  emails!: string[];
}
