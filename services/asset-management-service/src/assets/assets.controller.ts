import {
  Body,
  Controller,
  Patch,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';
import { CreateAssetUseCase } from './application/use-cases/create-asset.use-case';
import { FindAllAssetsUseCase } from './application/use-cases/find-all-assets.use-case';
import { FindAssetByIdUseCase } from './application/use-cases/find-asset-by-id.use-case';
import { UpdateAssetUseCase } from './application/use-cases/update-asset.use-case';
import { UpdateAssetStatusUseCase } from './application/use-cases/update-asset-status.use-case';
import { DeactivateAssetUseCase } from './application/use-cases/deactivate-asset.use-case';

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly createAssetUseCase: CreateAssetUseCase,
    private readonly findAllAssetsUseCase: FindAllAssetsUseCase,
    private readonly findAssetByIdUseCase: FindAssetByIdUseCase,
    private readonly updateAssetUseCase: UpdateAssetUseCase,
    private readonly updateAssetStatusUseCase: UpdateAssetStatusUseCase,
    private readonly deactivateAssetUseCase: DeactivateAssetUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateAssetDto) {
    try {
      const asset = await this.createAssetUseCase.execute(dto);

      return asset.toObject();
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Get()
  async findAll() {
    const assets = await this.findAllAssetsUseCase.execute();

    return assets.map((asset) => asset.toObject());
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const asset = await this.findAssetByIdUseCase.execute(id);

    return asset.toObject();
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAssetStatusDto,
  ) {
    const asset = await this.updateAssetStatusUseCase.execute(id, dto.status);

    return asset.toObject();
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const asset = await this.deactivateAssetUseCase.execute(id);

      return asset.toObject();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    try {
      const asset = await this.updateAssetUseCase.execute(id, dto);

      return asset.toObject();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
