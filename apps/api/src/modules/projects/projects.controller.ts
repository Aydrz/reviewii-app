import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, CreateGuestLinkDto } from '@reviewii/shared-types';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.projectsService.findAll(status, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateProjectDto) {
    // Single editor ownerId default placeholder
    const ownerId = 'editor-default-id';
    return this.projectsService.create(ownerId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.projectsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/guest-link')
  async createGuestLink(@Param('id') id: string, @Body() body: CreateGuestLinkDto) {
    return this.projectsService.createGuestLink(id, body);
  }
}
