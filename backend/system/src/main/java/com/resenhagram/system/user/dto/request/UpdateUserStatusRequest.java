package com.resenhagram.system.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserStatusRequest(

        @NotBlank(message = "O status é obrigatório")
        String status
) {
}