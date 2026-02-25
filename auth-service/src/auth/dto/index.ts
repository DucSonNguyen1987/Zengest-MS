/**
 * Barrel file — centralise les exports des DTOs.
 * Permet d'importer depuis un seul endroit :
 *   import { RegisterDto, LoginDto } from './dto';
 * au lieu de :
 *   import { RegisterDto } from './dto/register.dto';
 *   import { LoginDto } from './dto/login.dto';
 */
export { RegisterDto } from './register.dto';
export { LoginDto } from './login.dto';
