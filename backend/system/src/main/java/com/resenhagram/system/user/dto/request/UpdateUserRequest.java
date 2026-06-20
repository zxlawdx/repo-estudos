package com.resenhagram.system.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(

        @NotBlank(message = "O nome de exibição é obrigatório")
        @Size(max = 100, message = "O nome de exibição deve ter no máximo 100 caracteres")
        String displayName
) {
}