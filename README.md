# AppTicket-React

Aplicación de gestión de tickets desarrollada con React y Material UI, que se conecta a un backend Flask.

## Características

- **Listado de Tickets**: Visualización de tickets con paginación (50 tickets por página)
- **Importación de Excel**: Soporte para importar tickets desde archivos Excel/CSV con el formato específico
- **Kanban**: Vista de tickets organizada por estados
- **Edición de Tickets**: Formulario para editar los detalles de cada ticket
- **Monitoreo de Servidores**: Panel para gestionar y monitorear servidores

## Estructura de Datos

La aplicación está diseñada para trabajar con la siguiente estructura de datos de tickets:

1. `id`: Identificador único del ticket
2. `ticket_number`: Número de ticket
3. `creation_date`: Fecha de creación
4. `agent`: Agente asignado
5. `status`: Estado del ticket
6. `collaborators`: Colaboradores
7. `first_response`: Primera respuesta
8. `sla_resolution`: SLA de resolución
9. `close_date`: Fecha de cierre
10. `delay`: Demora
11. `user`: Usuario
12. `details`: Detalles del ticket
13. `priority`: Prioridad
14. `type`: Tipo
15. `branch`: Sucursal

## Importación de Excel

El sistema soporta la importación de tickets desde archivos Excel con las siguientes columnas en este orden exacto:
- Ticket
- Fecha de creacion
- Agente
- Estado
- Colaboradores
- Primera Respuesta
- SLA de Resolucion
- Fecha de cierre
- Demora
- Usuario

## Configuración

El frontend se conecta al backend Flask que corre en el puerto 5002. Esta configuración se puede ajustar en el archivo `src/services/api.ts`.

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar la aplicación en modo desarrollo
npm start
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Construcción para producción

```bash
npm run build
```

## Backend

El backend está desarrollado en Flask y debe estar ejecutándose en el puerto 5002 para que la aplicación funcione correctamente.
